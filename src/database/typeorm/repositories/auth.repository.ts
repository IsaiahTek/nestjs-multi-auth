import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { AuthRepository } from '../../../auth/interfaces/repositories.interface';
import { Auth as CoreAuth } from '../../../auth/interfaces/models.interface';
import { Auth } from '../entities/auth.entity';
import { AuthStrategy } from '../../../auth/enums/auth-type.enum';

@Injectable()
export class TypeOrmAuthRepository implements AuthRepository {
  constructor(
    @InjectRepository(Auth)
    private readonly repo: Repository<Auth>,
  ) {}

  async create(data: Partial<CoreAuth>): Promise<CoreAuth> {
    const entity = this.repo.create(data);
    return entity;
  }

  async findById(id: string): Promise<CoreAuth | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByUid(uid: string): Promise<CoreAuth | null> {
    return this.repo.findOne({ where: { uid } });
  }

  async findByUidAndStrategy(uid: string, strategy: AuthStrategy): Promise<CoreAuth | null> {
    return this.repo.findOne({ where: { uid, strategy } });
  }

  async findByUidAndStrategies(uid: string, strategies: AuthStrategy[]): Promise<CoreAuth | null> {
    return this.repo.findOne({ where: { uid, strategy: In(strategies) } as any });
  }

  async findAllByUid(uid: string): Promise<CoreAuth[]> {
    return this.repo.find({ where: { uid }, relations: ['identifiers', 'oauthProviders'] });
  }

  async findAll(): Promise<CoreAuth[]> {
    return this.repo.find({ relations: ['identifiers', 'oauthProviders'] });
  }

  async save(auth: CoreAuth): Promise<CoreAuth> {
    return this.repo.save(auth);
  }

  async update(id: string, data: Partial<CoreAuth>): Promise<void> {
    await this.repo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteByUid(uid: string): Promise<void> {
    await this.repo.delete({ uid });
  }

  async findWithIdentifiers(id: string): Promise<CoreAuth | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['identifiers'],
    });
  }
}
