import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Wallet & Economy Module
 * In MVP: Manages append-only xp_ledger.
 * In R3: Virtual coin ledger (scaffolded and disabled).
 */
@Module({
  providers: [PrismaService],
  exports: [],
})
export class WalletModule {}

