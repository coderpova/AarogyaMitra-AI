import Link from "next/link";


interface ActionCardProps {

    title: string;

    description: string;

    link: string;

}



export default function ActionCard({

    title,

    description,

    link

}: ActionCardProps) {


    return (

        <Link href={link} className="block h-full">


            <div
                className="
                h-40
                bg-white
                dark:bg-gray-800
                rounded-2xl
                shadow-md
                p-6
                hover:shadow-xl
                transition-all
                duration-300
                cursor-pointer
                border
                border-gray-200
                dark:border-gray-700
                "
            >


                <h3
                    className="
                    text-xl
                    font-bold
                    text-blue-700
                    dark:text-blue-400
                    "
                >

                    {title}

                </h3>



                <p
                    className="
                    mt-3
                    text-gray-600
                    dark:text-gray-300
                    "
                >

                    {description}

                </p>



            </div>


        </Link>

    );

}