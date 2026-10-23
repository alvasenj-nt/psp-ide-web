/**
 * Simulación de una jornada en la tienda.
 *
 * TODO:
 * 1. Crea el almacén con 120 camisetas, 100 pantalones y 80 sudaderas.
 * 2. Crea tres dependientes, Ana, Luis y Marta, cada uno con 150 pedidos
 *    generados con Pedidos.generar(semilla, 150) y las semillas 1, 2 y 3.
 * 3. Crea un hilo reponedor con una expresión lambda que, cuatro veces,
 *    reponga 10 unidades de cada prenda y después espere 20 ms.
 * 4. Pon a trabajar los cuatro hilos a la vez y espera a que terminen todos.
 * 5. Muestra el resultado con mostrarVentas() y comprobarInventario().
 */
public class Main {

    static final int STOCK_INICIAL = 120 + 100 + 80;
    static final int UNIDADES_REPUESTAS = 4 * 10 * Prenda.values().length;

    public static void main(String[] args) throws InterruptedException {
        // TODO
    }

    // ---------- Métodos de apoyo: no modificar ----------

    static int mostrarVentas(Dependiente... dependientes) {
        int total = 0;
        for (Dependiente d : dependientes) {
            System.out.println("Ventas de " + d.getNombre() + ": " + d.getVentas());
            total += d.getVentas();
        }
        System.out.println("Ventas totales: " + total);
        return total;
    }

    static void comprobarInventario(Almacen almacen, int ventasTotales) {
        for (Prenda prenda : Prenda.values()) {
            System.out.println("Stock final de " + prenda + ": " + almacen.getStock(prenda));
        }
        int esperado = STOCK_INICIAL + UNIDADES_REPUESTAS - ventasTotales;
        int real = almacen.getStockTotal();
        System.out.println("Stock total esperado: " + esperado + ", real: " + real);
        System.out.println("Inventario coherente: " + (esperado == real ? "sí" : "NO"));
    }
}
