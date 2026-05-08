import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ROIReccordDocument = ROIRecord & Document;

@Schema({ timestamps: true })
export class ROIRecord {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ required: true })
  frameNumber: number;

  @Prop({ required: true })
  xMin: number;

  @Prop({ required: true })
  yMin: number;

  @Prop({ required: true })
  xMax: number;

  @Prop({ required: true })
  yMax: number;

  @Prop()
  confidence: number;
}

export const ROIRecordSchema = SchemaFactory.createForClass(ROIRecord);

ROIRecordSchema.set('toJSON', {
  transform: (doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
