import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';


const createMockRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findWithAuthByProviderUserId: jest.fn(),
    findWithAuthByValue: jest.fn(),
    findByUidAndEnabled: jest.fn(),
    findAllByUid: jest.fn(),
    findByUid: jest.fn(),
    findLatestUnusedByPurpose: jest.fn(),
    issue: jest.fn(),
    verify: jest.fn(),
    resend: jest.fn(),
    deleteByUid: jest.fn(),
    findById: jest.fn(),
    findByUidAndNamespace: jest.fn(),
    findByStrategyAndValue: jest.fn()
});

let mockRepo: any = createMockRepo();

describe('CLI Migration Tool', () => {
    const dbDir = path.join(process.cwd(), 'src/database');
    const dataSourcePath = path.join(dbDir, 'data-source.ts');

    beforeAll(() => {
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(dataSourcePath)) {
            fs.unlinkSync(dataSourcePath);
        }
    });

    afterAll(() => {
        // We leave the directory as it was created for testing purposes, but cleanup the file
    });

    it('should fail if data-source is missing', () => {
        try {
            // Ensure file doesn't exist
            if (fs.existsSync(dataSourcePath)) fs.unlinkSync(dataSourcePath);
            
            execSync('node bin/cli.js doctor', { stdio: 'pipe' });
            throw new Error('Should have failed');
        } catch (error: any) {
            expect(error.stderr.toString()).toContain('Could not find data-source file');
        }
    });

    it('should run doctor successfully with mock data-source', () => {
        const mockDataSource = `
            const { DataSource } = require('typeorm');
            const mock = {
                isInitialized: true,
                initialize: async () => mock,
                destroy: async () => {},
                query: async (q) => {
                    if (q.includes('auth_schema_meta')) return [{ version: 5 }];
                    return [];
                },
                options: { type: 'sqlite', database: ':memory:' },
                entityMetadatas: []
            };
            Object.setPrototypeOf(mock, DataSource.prototype);
            exports.AppDataSource = mock;
        `;
        fs.writeFileSync(dataSourcePath, mockDataSource);

        try {
            const output = execSync('node bin/cli.js doctor', { encoding: 'utf8', stdio: 'pipe' });
            expect(output).toMatch(/Current auth schema version:.*5/);
        } catch (error: any) {
            console.error('CLI Error:', error.stdout, error.stderr);
            throw error;
        }
    });

    it('should run migrate successfully with mock data-source', () => {
        const mockDataSource = `
            const { DataSource } = require('typeorm');
            const mock = {
                isInitialized: true,
                initialize: async () => mock,
                destroy: async () => {},
                createQueryRunner: () => ({
                    connect: async () => {},
                    startTransaction: async () => {},
                    commitTransaction: async () => {},
                    rollbackTransaction: async () => {},
                    release: async () => {},
                    query: async (q) => {
                        if (q.includes('SELECT version')) return [{ version: 0 }];
                        return [];
                    },
                }),
                options: { type: 'sqlite', database: ':memory:' },
                entityMetadatas: []
            };
            Object.setPrototypeOf(mock, DataSource.prototype);
            exports.AppDataSource = mock;
        `;
        fs.writeFileSync(dataSourcePath, mockDataSource);

        try {
            const output = execSync('node bin/cli.js migrate', { encoding: 'utf8', stdio: 'pipe' });
            expect(output).toMatch(/Auth migrations completed/);
        } catch (error: any) {
            console.error('CLI Error:', error.stdout, error.stderr);
            throw error;
        }
    });
});
