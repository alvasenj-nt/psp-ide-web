package ejercicio1;

/**
 * Jornada del ejercicio 1 (solo lectura).
 *
 * Crea un almacén con 5.000 camisetas y pone a trabajar a la vez cuatro
 * hilos sobre él: dos reponedores, que reponen 10.000 camisetas cada uno, y
 * dos dependientes, que intentan vender 8.000 camisetas cada uno.
 *
 * Cuando terminan todos, muestra las camisetas repuestas y vendidas y
 * comprueba si el stock real coincide con el esperado
 * (inicial + repuestas - vendidas) y no es negativo.
 */
public class Main {

    private static final int REPOSICIONES_POR_REPONEDOR = 10_000;
    private static final int VENTAS_POR_DEPENDIENTE = 8_000;
    private static final int STOCK_INICIAL = 5_000;

    public static void main(String[] args) throws InterruptedException {
        Almacen almacen = new Almacen(STOCK_INICIAL);
        int[] vendidas = new int[2];

        Thread reponedor1 = new Thread(() -> reponer(almacen), "Reponedor-1");
        Thread reponedor2 = new Thread(() -> reponer(almacen), "Reponedor-2");
        Thread dependiente1 = new Thread(() -> vendidas[0] = vender(almacen), "Dependiente-1");
        Thread dependiente2 = new Thread(() -> vendidas[1] = vender(almacen), "Dependiente-2");

        Thread[] hilos = {reponedor1, reponedor2, dependiente1, dependiente2};
        for (Thread hilo : hilos) {
            hilo.start();
        }
        for (Thread hilo : hilos) {
            hilo.join();
        }

        int repuestas = 2 * REPOSICIONES_POR_REPONEDOR;
        int totalVendidas = vendidas[0] + vendidas[1];
        int esperado = STOCK_INICIAL + repuestas - totalVendidas;
        int real = almacen.getCamisetas();
        System.out.println("Stock inicial: " + STOCK_INICIAL + ", camisetas repuestas: " + repuestas);
        System.out.println("Camisetas vendidas: " + totalVendidas);
        System.out.println("Stock esperado: " + esperado + ", stock real: " + real);
        System.out.println("Inventario coherente: " + (esperado == real && real >= 0 ? "sí" : "NO"));
    }

    private static void reponer(Almacen almacen) {
        for (int i = 0; i < REPOSICIONES_POR_REPONEDOR; i++) {
            almacen.reponer();
        }
    }

    private static int vender(Almacen almacen) {
        int vendidas = 0;
        for (int i = 0; i < VENTAS_POR_DEPENDIENTE; i++) {
            if (almacen.vender()) {
                vendidas++;
            }
        }
        return vendidas;
    }
}
