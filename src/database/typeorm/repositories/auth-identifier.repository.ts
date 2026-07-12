import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthIdentifierRepository } from '../../../auth/interfaces/repositories.interface';
import { AuthIdentifier as CoreAuthIdentifier, Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
import { AuthIdentifier } from '../entities/auth-identify.entity';
import { IdentifierType } from '../../../auth/enums/identifier-type.enum';

@Injectable()
export class TypeOrmAuthIdentifierRepository implements AuthIdentifierRepository {
  constructor(
    @InjectRepository(AuthIdentifier)
    private readonly repo: Repository<AuthIdentifier>,
  ) {}

  async create(data: Partial<CoreAuthIdentifier>): Promise<CoreAuthIdentifier> {
    return this.repo.create(data);
  }

  async findByValue(value: string): Promise<CoreAuthIdentifier | null> {
    return this.repo.findOne({ where: { value } });
  }

  async findByAuthId(authId: string): Promise<CoreAuthIdentifier[]> {
    return this.repo.find({ where: { auth: { id: authId } } });
  }

  async findByUidAndTypes(uid: string, types: string[]): Promise<CoreAuthIdentifier | null> {
    const res = await this.repo.query(
      `SELECT ai.* FROM auth_identifiers ai 
       JOIN auth a ON ai."authId" = a.id 
       WHERE a.uid = $1 AND ai.type = ANY($2::auth_identifier_type_enum[])
       ORDER BY ai."isVerified" DESC, ai."createdAt" ASC LIMIT 1`,
      [uid, types]
    );
    return res[0] || null;
  }

  async findWithAuthByValue(value: string): Promise<{ identifier: CoreAuthIdentifier; auth: CoreAuth } | null> {
    const res = await this.repo.query(
      `SELECT ai.*, a.uid, a.id as "authId" FROM auth_identifiers ai 
       JOIN auth a ON ai."authId" = a.id 
       WHERE ai.value = $1 LIMIT 1`,
      [value.toLowerCase()]
    );
    if (!res[0]) return null;
    return {
      identifier: res[0] as CoreAuthIdentifier,
      auth: { uid: res[0].uid, id: res[0].authId } as CoreAuth,
    };
  }

  async save(identifier: CoreAuthIdentifier): Promise<CoreAuthIdentifier> {
    return this.repo.save(identifier);
  }

  async markVerifiedByAuthId(authId: string): Promise<void> {
    await this.repo.query(
      `UPDATE auth_identifiers SET "isVerified" = true WHERE "authId" = $1`,
      [authId]
    );
  }
}
