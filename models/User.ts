import { Schema, models, model } from "mongoose";


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

    default:"",

  },

  googleId: {
    type: String,
    default: null,
    sparse: true,
  },

  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  gmail: {
    accessToken: { type: String, default: "" },
    refreshToken: { type: String, default: "" },
    tokenExpiry: { type: Date, default: null },
    connected: { type: Boolean, default: false },
    lastSync: { type: Date, default: null },
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

    },

    height:{

      type:Number,

      default:null,

    },

    weight:{

      type:Number,

      default:null,

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

    


  medicalHistory:[


    {


      condition:{


        type:String,

        default:"",


      },


      diagnosedDate:{


        type:String,

        default:"",


      },


      notes:{


        type:String,

        default:"",


      }


    }


  ],







  allergies:[


    {


      name:{


        type:String,

        default:"",


      },


      severity:{


        type:String,

        default:"",


      }


    }


  ],







  symptomsHistory:[


    {


      symptom:{


        type:String,

        default:"",


      },


      date:{


        type:String,

        default:"",


      },


      severity:{


        type:String,

        default:"",


      }


    }


  ],








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


  ],


  settings: {
    language: {
      type: String,
      default: "en",
    },
  },

  aiPreferences: {
    allowHealthHistory: {
      type: Boolean,
      default: false,
    },
    allowMedicalReports: {
      type: Boolean,
      default: false,
    },
    allowMedications: {
      type: Boolean,
      default: false,
    },
    allowSymptomTimeline: {
      type: Boolean,
      default: false,
    },
  },

},



{

  timestamps:true

}



);





const User = models.User || model("User", UserSchema);



export default User;