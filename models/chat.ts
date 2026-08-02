import mongoose, { Schema, models } from "mongoose";


const chatSchema = new Schema(

  {

    userId: {

      type: String,

      required: true,

    },


    message: {

      type: String,

      required: true,

    },


    reply: {

      type: String,

      required: true,

    },


  },

  {

    timestamps: true,

  }

);





// chatSchema ...

const chat = models.chat || mongoose.model("chat", chatSchema);

export default chat;