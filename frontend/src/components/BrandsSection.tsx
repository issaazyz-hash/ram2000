import { Link } from "react-router-dom";

const BrandsSection = () => {
  const brands = [
    {
      name: 'Kia',
      image: '/cars.logo/Kia.svg',
      path: '/kia-cars'
    },
    {
      name: 'Hyundai',
      image: '/hyundai.png',
      path: '/hyundai-cars'
    }
  ];

  return (
    <section className="w-full bg-white py-8 sm:py-10">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">

        <h2 className="text-center text-xl sm:text-2xl font-bold tracking-wide text-orange-500 mb-6 sm:mb-8">
          NOS MARQUES DISPONIBLES
        </h2>

        {/* GRID بدل FLEX */}
        <div className="
          grid 
          grid-cols-2 
          gap-4 
          sm:gap-6 
          place-items-center
        ">
          {brands.map((brand) => (
            <Link
              key={brand.name}
              to={brand.path}
              className=" 
                bg-[#f7f7f7] 
                rounded-xl 
                shadow-sm 
                hover:shadow-md 
                transition-shadow 
                flex 
                flex-col 
                items-center 
                justify-center 
                px-4 
                py-6
                w-full
              "
            >
              <img
                src={brand.image}
                alt={brand.name}
                className="mb-4 h-14 sm:h-16 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <p className="text-sm sm:text-base font-medium text-gray-700 text-center">
                {brand.name}
              </p>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};

export default BrandsSection;