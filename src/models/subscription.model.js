import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber: {
        type: Schema.Types.ObjectId, // One who is subscribing 
        ref: "Users"
    },
    channel: {
        type: Schema.Types.ObjectId, // One to whom 'subscriber' is subscribing 
        ref: "Users"
    }

}, { timeseries: true });


export const Subscription = mongoose.model("Susbcription", subscriptionSchema);