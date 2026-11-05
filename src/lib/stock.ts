// Productos de stock y barras que se cuentan (antes en legacy/supabase_client.js).

export type ProductoStock = { categoria: string; nombre: string };

export const PRODUCTOS_STOCK: ProductoStock[] = [
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Champagne Baron B"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Champagne Baron B rose"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Champagne Mumm"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Champagne Mumm lager"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Chandon Delice"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Chandon Delice Rose"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Chandon Extra Brut"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Chandon Aperitif"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Champagne de corte (cúter/renas/callia, etc)"
  },
  {
    "categoria": "CHAMPAGNE",
    "nombre": "Espumante Callia"
  },
  {
    "categoria": "VODKA ABSOLUT",
    "nombre": "Absolut vodka swedish 700ml"
  },
  {
    "categoria": "VODKA ABSOLUT",
    "nombre": "Absolut clásico 500ml"
  },
  {
    "categoria": "VODKA ABSOLUT",
    "nombre": "Absolut saborizado"
  },
  {
    "categoria": "VODKA ABSOLUT",
    "nombre": "Absolut Tabasco"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Callia"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino callia rose"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Santa Julia"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Cafayate"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Chacabuco"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Cafayate Malbec"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Chico Zossi (todas las variedades)"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Eugenio Bustos"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino La Linda"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino ö-61 Malbec"
  },
  {
    "categoria": "VINOS",
    "nombre": "Vino Rutini Malbec"
  },
  {
    "categoria": "COCA COLA",
    "nombre": "Coca cola vidrio 350ml"
  },
  {
    "categoria": "COCA COLA",
    "nombre": "Coca cola vidrio zero 350ml"
  },
  {
    "categoria": "COCA COLA",
    "nombre": "Gaseosa coca cola pet 375ml"
  },
  {
    "categoria": "COCA COLA",
    "nombre": "Gaseosa coca cola Zero pet 375ml"
  },
  {
    "categoria": "COCA COLA",
    "nombre": "Gaseosa coca cola 1.5L"
  },
  {
    "categoria": "COCA COLA",
    "nombre": "Gaseosa coca cola zero 1.5L"
  },
  {
    "categoria": "SKYY",
    "nombre": "Skyy (todas las presentaciones)"
  },
  {
    "categoria": "ENERGIZANTE",
    "nombre": "Energizante Red Bull 250 ml"
  },
  {
    "categoria": "ENERGIZANTE",
    "nombre": "Energizante Speed 250ml"
  },
  {
    "categoria": "ENERGIZANTE",
    "nombre": "Energizante Sugar Free 250ml"
  },
  {
    "categoria": "ENERGIZANTE",
    "nombre": "Energizante Red Bull Red 250ml"
  },
  {
    "categoria": "ENERGIZANTE",
    "nombre": "Energizante Red Bull green 250ml"
  },
  {
    "categoria": "ENERGIZANTE",
    "nombre": "Energizante Red Bull summer"
  },
  {
    "categoria": "GIN",
    "nombre": "Gin Bombay"
  },
  {
    "categoria": "GIN",
    "nombre": "Gin Bull Dog"
  },
  {
    "categoria": "GIN",
    "nombre": "Gin Spirito Blu"
  },
  {
    "categoria": "GIN",
    "nombre": "Gin Beefeater 1L"
  },
  {
    "categoria": "GIN",
    "nombre": "Gin Beefeater 700ml"
  },
  {
    "categoria": "GIN",
    "nombre": "Gin Beefeater Pink 700ml"
  },
  {
    "categoria": "GIN",
    "nombre": "Gin Beefeater Blood Orange 700ml"
  },
  {
    "categoria": "FERNET",
    "nombre": "Fernet Branca 750ml"
  },
  {
    "categoria": "FERNET",
    "nombre": "Fernet Branca 1lt"
  },
  {
    "categoria": "FERNET",
    "nombre": "Fernet Branca 450ml"
  },
  {
    "categoria": "CERVEZA",
    "nombre": "Cerveza Heineken 330ml"
  },
  {
    "categoria": "CERVEZA",
    "nombre": "Cerveza Miller 330cc"
  },
  {
    "categoria": "CERVEZA",
    "nombre": "Cerveza Imperial 300ml"
  },
  {
    "categoria": "CERVEZA",
    "nombre": "Cerveza Sin alcohol"
  },
  {
    "categoria": "CERVEZA",
    "nombre": "Cerveza Blue Moon"
  },
  {
    "categoria": "AGUAS",
    "nombre": "Agua mineral Benedictino s/gas"
  },
  {
    "categoria": "AGUAS",
    "nombre": "Agua mineral Palau s/gas"
  },
  {
    "categoria": "AGUAS",
    "nombre": "Agua mineral Villa del Sur s/gas"
  },
  {
    "categoria": "AGUAS",
    "nombre": "Agua tóxica schweppes 375ml"
  },
  {
    "categoria": "AGUAS",
    "nombre": "Agua tonica schweppes 310ml"
  },
  {
    "categoria": "AGUAS",
    "nombre": "Agua tónica 1,5L"
  },
  {
    "categoria": "AGUAS",
    "nombre": "Agua mineral Benedictino c/gas"
  },
  {
    "categoria": "CONSUMO SOCIOS",
    "nombre": "Whisky Johnnie Walker Swing (Consumo Socios)"
  },
  {
    "categoria": "CONSUMO SOCIOS",
    "nombre": "Vodka Absolut Elyx (Consumo Socios)"
  },
  {
    "categoria": "CONSUMO SOCIOS",
    "nombre": "Red Bull (Consumo Socios)"
  },
  {
    "categoria": "CONSUMO SOCIOS",
    "nombre": "Fernet Branca 750ml (Consumo Socios)"
  },
  {
    "categoria": "CONSUMO SOCIOS",
    "nombre": "Vodka Grey Goose (Consumo Socios)"
  }
];

/** Barras que se cuentan en el stock (mismas opciones que el select del bartender). */
export const BARRAS_STOCK = [
  "Principal",
  "Cantina",
  "Warhol",
  "Patio",
  "Altillo"
] as const;

/** Sectores de barra para convocar y para las propinas (panel de Jefe de Barra). */
export const SECTORES_BARRA = ["Vip", "Cantina", "Altillo", "Principal", "Patio", "Evento"] as const;
