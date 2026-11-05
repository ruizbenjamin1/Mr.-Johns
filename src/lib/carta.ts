// Carta del bar (antes dentro de legacy/Dashboard.js).

export type Plato = { nombre: string; descripcion: string; etiqueta: string | null };
export type Bebida = { nombre: string; descripcion: string };

export const COMIDAS: Plato[] = [
  {
    "nombre": "Bastoncitos de quesos crocantes",
    "descripcion": "Rebozados de queso, acompañados de salsa de tomates frescos y cebolla morada.",
    "etiqueta": null
  },
  {
    "nombre": "Tequeños de queso",
    "descripcion": "Rollitos de queso empanados, acompañados con salsa de la casa.",
    "etiqueta": null
  },
  {
    "nombre": "Papa Plomo Rellena",
    "descripcion": "Con dados de pollo o lomo salteado con panceta ahumada y vegetales, queso crema, manteca saborizada, ciboulette, gratinada.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Chalupa de Puebla",
    "descripcion": "Base de tortilla super crocante, salteado de pollo con vegetales, guacamole, cebolla encurtida y queso crema de ciboulette.",
    "etiqueta": null
  },
  {
    "nombre": "Baba Ganoush",
    "descripcion": "Pate de berenjenas asadas acompañado con pan pita, grisines, verduras frescas, esferas de queso y falafel.",
    "etiqueta": null
  },
  {
    "nombre": "Cazuela de quesos fundidos",
    "descripcion": "Para los amantes del queso, los mejores queso argentinos fundidos acompañados de cubos de pan tostado, tomates cherries, albahaca, grisines y toque fresco de guacamole.",
    "etiqueta": null
  },
  {
    "nombre": "Rabas soufflé",
    "descripcion": "Anillos de calamar fritos, acompañados de aderezo cítrico y mayo tabasco.",
    "etiqueta": null
  },
  {
    "nombre": "Picada Fría para 2",
    "descripcion": "Queso tybo en fetas, cantimpalo, bondiola, jamón cocido, olivas verdes y negras, pinchos de queso tomates y rúcula, trufas de queso azul y tostadas saborizadas.",
    "etiqueta": null
  },
  {
    "nombre": "Picada Caliente para 2",
    "descripcion": "Tequeños, bastones de mozzarella, croquetas de queso, trocitos de pollo KFC, papas fritas y salsas.",
    "etiqueta": null
  },
  {
    "nombre": "Tabla Finger Food para 4",
    "descripcion": "Nuggets de pollo y carne con salsa cheddar y BBQ ahumada, pulpetines de roast beef con salsa tabasco, pinchos de queso, rúcula y tomates secos, trufas de queso azul y nueces, jamón cocido, frasco de quesos y pimientos ahumados.",
    "etiqueta": null
  },
  {
    "nombre": "Parrillero Argento Sandwich",
    "descripcion": "Lomo, vegetales, tomates, rúcula y crema de pimientos.",
    "etiqueta": null
  },
  {
    "nombre": "Pollo KFC",
    "descripcion": "Pechuguitas de pollo crocante estilo kentuky, papas fondue y salsa de mostaza y miel.",
    "etiqueta": null
  },
  {
    "nombre": "Quesadillas de pollo",
    "descripcion": "Tortillas de trigo rellenas de pollo con quesos fundidos, cebollas caramelizadas, sour cream y pasta de frijoles.",
    "etiqueta": null
  },
  {
    "nombre": "Papas New York/Argenta",
    "descripcion": "Papas con salsa cheddar y panceta crispy, tiritas de picana, pimientos asados y salsa de verdeo.",
    "etiqueta": null
  },
  {
    "nombre": "Espiral de lomo",
    "descripcion": "Con tomates rúcula, queso parmigiano, olivas negras, papas rusticas con hierbas.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Tiritas de pollo grilladas con hierbas",
    "descripcion": "Sobre mézclum de hojas verdes y tomates quemados a la chapa y aderezo cítrico.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Tournedó",
    "descripcion": "Medallón de filet con manteca pomada de hiervas y papa plomo.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Pollo al estilo oriental salteado al wok",
    "descripcion": "With vegetales de estación, salsa de soja, mix de semillas, arroz frito con maní.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Burrito 2.0 fusión",
    "descripcion": "Roll de carne, panceta y vegetales en tortilla mexicana gratinada con queso parmigiano servida sobre salsa cheddar y pico de gallo.",
    "etiqueta": null
  },
  {
    "nombre": "Pizza Mr Johns",
    "descripcion": "Lengüeta con mozzarella, aceitunas negras, bondiola y morrones crema.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Pizza 6 Quesos",
    "descripcion": "Lengüeta con mozzarella, provolone, queso azul dambo, cheddar y chips crocantes de parmesano.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Pizza Jackie Kennedy",
    "descripcion": "Lengüeta con mozzarella, panceta, champignones y ciboulette.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Pizza Super Caprese",
    "descripcion": "Lengüeta con mozzarella, tomates secos, tomates cherries, albahaca fresca y con una sabrosa decoración de pesto genovés y de tomates secos.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Pizza New York",
    "descripcion": "Lengüeta con jamón ahumado, panceta, cantimpalo, carne y pimientos asados.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Hamburguesa Mr Johns",
    "descripcion": "3 medallones de carne de 100 grs, acompañados con salsa y aderezo mac secreto, panceta crocante y queso cheddar.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Hamburguesa Cheddar Lake",
    "descripcion": "2 medallones de carne de 100 grs, base de lago cheddar y polvo de panceta.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Hamburguesa Oh la la Paris",
    "descripcion": "2 medallones de carne de 100 grs, con queso azul derretido sobre champignones a la provenzal y cebollas caramelizadas.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Hamburguesa Crispy Burger",
    "descripcion": "2 medallones de carne de 100 grs, doble cheddar, salsa ahumada, coronados por esferas de queso crocante y cebollas crispy.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Ensalada Cesar Curry",
    "descripcion": "Ensalada de pollo grillado al curry, hojas verdes, croutons de pan de campo, queso parmesano, olivas negras y alineo cesars.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Ensalada Tibia Caprese de trufas de queso",
    "descripcion": "Ensalada de tomates cherries, trufas de queso y albahaca fresca sobre base de focaccia dorada con aceite de oliva acompañada por vinagreta de aceto balsámico y pomelo rosado.",
    "etiqueta": "SIN TACC"
  },
  {
    "nombre": "Copa Frutos Rojos",
    "descripcion": "Mix de frutos rojos con merenguitos crocantes, crocante de almendras y helado de americana.",
    "etiqueta": null
  },
  {
    "nombre": "Brownie con Helado",
    "descripcion": "Brownie con helado de americana, coronada con frutos rojos.",
    "etiqueta": null
  }
];

export const BEBIDAS: Bebida[] = [
  {
    "nombre": "Caipiroska",
    "descripcion": "Ingredientes: 3 cubitos de limón, 3 Oz vodka skyy regular, 1 ½ Oz jugo de limón, 2 Oz almíbar o 3 cucharadas de azúcar. Método: Cocteleado. Cristalería: Vaso Huevo. Decoración: Dos rodajas de limón, y una flor de menta."
  },
  {
    "nombre": "Caipirinha",
    "descripcion": "Ingredientes: 3 cubitos de limón, 3 Oz cachaça (velho barreiro), 1½ Oz jugo de limón, 2 Oz almíbar o 3 cucharadas de azúcar. Método: Cocteleado. Cristalería: Vaso Huevo. Decoración: Dos rodajas de limón, y una flor de menta."
  },
  {
    "nombre": "Caipiamada",
    "descripcion": "Ingredientes: 3 cubitos de limón, 3 Oz vino tinto (callia), 1½ Oz jugo de limón, 2 Oz almíbar o 3 cucharadas de azúcar. Método: Cocteleado. Cristalería: Vaso Huevo. Decoración: Dos rodajas de limón, y una flor de menta."
  },
  {
    "nombre": "Limonada común",
    "descripcion": "Ingredientes: 3 cubitos de limón, 2 cucharadas de azúcar, 2 Oz jugo de limón, 3 Oz almíbar, un dash de agua. Método: Cocteleado. Cristalería: Copa Huracán. Decoración: Dos rodajas de limón y menta."
  },
  {
    "nombre": "Negroni",
    "descripcion": "Ingredientes: 1 Oz vermouth (carpano rosso), 1 Oz campari, 1 Oz gin london dry (beefeater 1L). Método: Refrescado. Cristalería: Old fashion. Decoración: Una rodaja de naranja."
  },
  {
    "nombre": "Old Fashion",
    "descripcion": "Ingredientes: 2 Oz Whisky (jim beam honey), Bitter Angostura, 4 cucharadas de azúcar. Método: Refrescado. Cristalería: Old fashion."
  },
  {
    "nombre": "Boulevardier",
    "descripcion": "Ingredientes: 1 Oz vermouth (carpano rosso), 1 Oz campari, 1 Oz whisky (jim beam honey). Método: Refrescado. Cristalería: Old fashion."
  },
  {
    "nombre": "Martini",
    "descripcion": "Ingredientes: 1½ Oz vermouth seco (martini), 2 Oz gin london dry (beefeater 1L). Método: Refrescado. Cristalería: Copa Martini."
  },
  {
    "nombre": "Manhattan",
    "descripcion": "Ingredientes: 1 Oz vermouth (carpano rosso), 2 Oz whisky (jim beam honey), 2 o 3 gotas de bitter angostura. Método: Refrescado. Cristalería: Copa Martini."
  },
  {
    "nombre": "Aperol Spritz",
    "descripcion": "Ingredientes: 2 o 3 Oz de aperol, Champagne de corte hasta que quede un dedo, agua con gas. Método: Directo. Cristalería: Copa aperol."
  },
  {
    "nombre": "Campari Orange",
    "descripcion": "Ingredientes: 2 o 3 Oz campari, completar el vaso con jugo de naranja. Método: Directo. Cristalería: Vaso Huevo."
  },
  {
    "nombre": "Sex on the beach",
    "descripcion": "Ingredientes: 2 Oz skyy reg, 1 Oz licor de durazno, jugo de naranja, granadina. Método: Directo. Cristalería: Copa Huracán."
  },
  {
    "nombre": "Malibu Punch",
    "descripcion": "Ingredientes: 2 o 3 Oz Malibu, jugo de naranja, granadina. Método: Directo. Cristalería: Copa Huracán."
  },
  {
    "nombre": "Mojito Malibu",
    "descripcion": "Ingredientes: 2 o 3 Oz Malibu, hojas de menta, azúcar, almíbar, limón, soda. Método: Construido. Cristalería: Vaso Huevo."
  },
  {
    "nombre": "Mojito Cubano",
    "descripcion": "Ingredientes: 2 o 3 Oz Ron blanco, hojas de menta, azúcar, almíbar, limón, soda. Método: Construido. Cristalería: Vaso Huevo."
  },
  {
    "nombre": "Cuba Libre",
    "descripcion": "Ingredientes: 2 o 3 Oz Ron dorado, jugo de limón, Coca-Cola. Método: Directo. Cristalería: Vaso Huevo."
  },
  {
    "nombre": "Gancia Batido",
    "descripcion": "Ingredientes: 2 o 3 Oz Gancia, jugo de limón, Almíbar. Método: Cocteleado. Cristalería: Vaso Huevo."
  },
  {
    "nombre": "Pisco Sour",
    "descripcion": "Ingredientes: 3 Oz Pisco, jugo de limón, almíbar. Método: Cocteleado y doble colado. Cristalería: Copa Martini."
  }
];
