import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VideoDocument = Video & Document;

@Schema({ timestamps: true })
export class Video {
  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  originalPath: string;

  @Prop()
  processedPath: string;

  @Prop({ default: 'pending', enum: ['pending', 'processing', 'completed', 'failed'] })
  status: string;

  @Prop()
  width: number;

  @Prop()
  height: number;

  @Prop()
  fps: number;

  @Prop()
  frameCount: number;

  @Prop()
  errorMessage: string;
}

export const VideoSchema = SchemaFactory.createForClass(Video);

// Transform the document to a plain object without _id and __v
VideoSchema.set('toJSON', {
  transform: (doc: any, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
