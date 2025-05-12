import mongoose from "mongoose";
const connectDB = async () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then((con) => console.log(`database connected : ${con.connection.host}`))
    .catch((err) => {
      console.log(err.message);
    });
};
export default connectDB;