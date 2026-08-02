import mongoose, { Schema, models, model } from "mongoose";


const UserSchema = new Schema(

{

  name:{

    type:String,

    required:true,

  },



  email:{

    type:String,

    required:true,

    unique:true,

  },



  password:{

    type:String,

    required:true,

  },




  profile:{


    age:{

      type:Number,

      default:null,

    },


    gender:{

      type:String,

      default:"",

    },


    bloodGroup:{

      type:String,

      default:"",

    },


    phone:{

      type:String,

      default:"",

    },


    address:{

      type:String,

      default:"",

    }


  },






  health:{


    heartRate:{

      type:Number,

      default:0,

    },


    steps:{

      type:Number,

      default:0,

    },


    healthScore:{

      type:Number,

      default:0,

    }


  },








  medicines:[


    {


      name:{


        type:String,

        required:true,

      },



      dose:{


        type:String,

        required:true,

      },



      time:{


        type:String,

        required:true,

      },



      reminder:{


        type:Boolean,

        default:false,

      }



    }


  ],







  appointments:[


    {


      doctor:{


        type:String,

        default:"",

      },


      hospital:{


        type:String,

        default:"",

      },


      date:{


        type:String,

        default:"",

      },


      status:{


        type:String,

        default:"Pending",

      }



    }


  ]



},



{

  timestamps:true

}



);





const User = models.User || model("User", UserSchema);



export default User;