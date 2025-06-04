import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { TransactionType } from "../models/transaction.model";

export type TransactionDocument = Transaction & Document;

@Schema()
export class Transaction {
  @Prop({ required: true, unique: true })
  transactionId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true, enum: TransactionType })
  type: TransactionType;

  @Prop({ required: true })
  amount: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
