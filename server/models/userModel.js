import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{type:String, required:true},
    password:{type:String, required:true},
    email:{type:String, required:true, unique:true},
    otp:{type:String, default: ''},
    otpExp:{type:Number, default:null},
    resetOtp:{type:String, default:null},
    resetOtpExp:{type:Number, default:null},
    isVerified:{type:Boolean, default:false},
    role:{type:String, enum:['user', 'admin'], default:'user'},
    profileImage:{type:String, default:null},
    profileImageId:{type:String, default:null},

}, {timestamps:true})


const userModel = mongoose.model('user', userSchema);

export default userModel;