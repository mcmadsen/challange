import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { TransactionType } from "../models/transaction.model";

export type TransactionDocument = Transaction & Document;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true, enum: TransactionType })
  type: string;

  @Prop({ required: true })
  amount: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
