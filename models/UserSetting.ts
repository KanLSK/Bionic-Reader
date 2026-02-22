import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserSetting extends Document {
  userId: string;
  sm2: {
    defaultEaseFactor: number;
    intervalModifier: number;
    hardMultiplier: number;
    easyMultiplier: number;
  };
  bionicReading: {
    fixation: number;
    saccade: number;
  };
}

const UserSettingSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true, index: true },
  sm2: {
    defaultEaseFactor: { type: Number, default: 2.5 },
    intervalModifier:  { type: Number, default: 1.0 },
    hardMultiplier:    { type: Number, default: 1.2 },
    easyMultiplier:    { type: Number, default: 1.3 },
  },
  bionicReading: {
    fixation: { type: Number, default: 50 },
    saccade:  { type: Number, default: 10 },
  },
}, { timestamps: true });

const UserSetting: Model<IUserSetting> =
  mongoose.models.UserSetting ||
  mongoose.model<IUserSetting>('UserSetting', UserSettingSchema);

export default UserSetting;
