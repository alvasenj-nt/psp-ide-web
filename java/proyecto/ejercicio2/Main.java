package ejercicio2;

/**
 * Jornada del ejercicio 2. No modificar.
 */
public class Main {

    private static final int VENTAS_POR_DEPENDIENTE = 100;

    public static void main(String[] args) throws InterruptedException {
        Almacen almacen = new Almacen(150, 150);
        int[] vendidas = new int[4];

        Thread[] dependientes = {
            new Thread(() -> vendidas[0] = venderCamisetas(almacen), "Camisetas-1"),
            new Thread(() -> vendidas[1] = venderCamisetas(almacen), "Camisetas-2"),
            new Thread(() -> vendidas[2] = venderPantalones(almacen), "Pantalones-1"),
            new Thread(() -> vendidas[3] = venderPantalones(almacen), "Pantalones-2"),
        };

        long inicio = System.currentTimeMillis();
        for (Thread d : dependientes) {
            d.start();
        }
        for (Thread d : dependientes) {
            d.join();
        }
        long duracion = System.currentTimeMillis() - inicio;

        int camisetasVendidas = vendidas[0] + vendidas[1];
        int pantalonesVendidos = vendidas[2] + vendidas[3];
        System.out.println("Camisetas vendidas: " + camisetasVendidas + ", quedan " + almacen.getCamisetas());
        System.out.println("Pantalones vendidos: " + pantalonesVendidos + ", quedan " + almacen.getPantalones());
        boolean coherente = camisetasVendidas + almacen.getCamisetas() == 150
                && pantalonesVendidos + almacen.getPantalones() == 150;
        System.out.println("Inventario coherente: " + (coherente ? "sí" : "NO"));
        System.out.println("Tiempo de la jornada: " + duracion + " ms");
    }

    private static int venderCamisetas(Almacen almacen) {
        int vendidas = 0;
        for (int i = 0; i < VENTAS_POR_DEPENDIENTE; i++) {
            if (almacen.venderCamiseta()) {
                vendidas++;
            }
        }
        return vendidas;
    }

    private static int venderPantalones(Almacen almacen) {
        int vendidos = 0;
        for (int i = 0; i < VENTAS_POR_DEPENDIENTE; i++) {
            if (almacen.venderPantalon()) {
                vendidos++;
            }
        }
        return vendidos;
    }
}
