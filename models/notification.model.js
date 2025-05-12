import mongoose, { Schema } from "mongoose";
const {schema} =mongoose;

const notificationSchema = new Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderId:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message:{
        type:String,
        required:true
    },
    location:{
        type:String,
    },
    read:{
        type:Boolean,
    },
    moreDetails:{
        type:String,
    }
},{
    timestamps:true
})

export const Notification = mongoose.model('Notification',notificationSchema)