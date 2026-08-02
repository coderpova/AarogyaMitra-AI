interface InfoCardProps {

    title: string;

    value: string;

    icon: string;

}



export default function InfoCard({

    title,

    value,

    icon

}: InfoCardProps) {



    return (


        <div
            className="
            h-40
            bg-white
            dark:bg-gray-800
            rounded-2xl
            shadow-md
            p-6
            border
            border-gray-200
            dark:border-gray-700
            transition
            hover:shadow-xl
            "
        >



            <div className="text-3xl">

                {icon}

            </div>





            <h3
                className="
                text-xl
                font-bold
                mt-3
                text-gray-900
                dark:text-white
                "
            >

                {title}

            </h3>





            <p
                className="
                text-gray-600
                dark:text-gray-300
                mt-2
                "
            >

                {value}

            </p>




        </div>


    );


}