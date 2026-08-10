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

    conversationId: {

      type: String,

      required: false,

    },

    title: {

      type: String,

      required: false,

    },

    isArchived: {

      type: Boolean,

      default: false,

    },

  },

  {

    timestamps: true,

  }

);





// chatSchema ...

const chat = models.chat || mongoose.model("chat", chatSchema);

export default chat;