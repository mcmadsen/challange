import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SyncStateDocument = SyncState & Document;

@Schema()
export class SyncState {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  lastSyncTime: Date;
}

export const SyncStateSchema = SchemaFactory.createForClass(SyncState);
