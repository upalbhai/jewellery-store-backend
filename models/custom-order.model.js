import mongoose, { Schema } from "mongoose";

const customOrderSchema = new Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message:{
        type:String,
        required:true
    },
    images:[{
        type:String,
        required: [true, 'Product image is required'],
    }]
},{
    timestamps:true
})

export const CustomOrder = mongoose.model('CustomOrder',customOrderSchema)