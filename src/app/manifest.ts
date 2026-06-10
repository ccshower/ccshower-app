import type { MetadataRoute } from "next";



export default function manifest(): MetadataRoute.Manifest {

  return {

    name: "CCSHOWER",

    short_name: "CCSHOWER",

    description: "CCSHOWER field operations system",

    start_url: "/",

    display: "standalone",

    background_color: "#f8fafc",

    theme_color: "#1a1f2e",

    lang: "en",

    orientation: "portrait-primary",

    icons: [

      {

        src: "/logo.png",

        sizes: "512x512",

        type: "image/png",

        purpose: "any",

      },

      {

        src: "/logo.png",

        sizes: "512x512",

        type: "image/png",

        purpose: "maskable",

      },

    ],

  };

}

