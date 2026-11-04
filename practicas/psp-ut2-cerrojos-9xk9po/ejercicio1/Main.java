package ejercicio1;

/**
 * Sesión de venta del ejercicio 1 (solo lectura).
 *
 * Crea una taquilla con 150 butacas en la Sala 1 y 150 en la Sala 2 y pone
 * a trabajar a la vez cuatro terminales de venta: dos venden entradas de la
 * Sala 1 y dos de la Sala 2, hasta 100 intentos cada uno.
 *
 * Al terminar, muestra las entradas vendidas en cada sala, comprueba que el
 * aforo cuadra y muestra el tiempo total empleado.
 */
public class Main {

    private static final int VENTAS_POR_TERMINAL = 100;

    public static void main(String[] args) throws InterruptedException {
        Taquilla taquilla = new Taquilla(150, 150);
        int[] vendidas = new int[4];

        Thread[] terminales = {
            new Thread(() -> vendidas[0] = venderSala1(taquilla), "Terminal-S1-A"),
            new Thread(() -> vendidas[1] = venderSala1(taquilla), "Terminal-S1-B"),
            new Thread(() -> vendidas[2] = venderSala2(taquilla), "Terminal-S2-A"),
            new Thread(() -> vendidas[3] = venderSala2(taquilla), "Terminal-S2-B"),
        };

        long inicio = System.currentTimeMillis();
        for (Thread t : terminales) {
            t.start();
        }
        for (Thread t : terminales) {
            t.join();
        }
        long duracion = System.currentTimeMillis() - inicio;

        int vendidasS1 = vendidas[0] + vendidas[1];
        int vendidasS2 = vendidas[2] + vendidas[3];
        System.out.println("Sala 1: vendidas " + vendidasS1 + ", libres " + taquilla.getButacasSala1());
        System.out.println("Sala 2: vendidas " + vendidasS2 + ", libres " + taquilla.getButacasSala2());
        boolean coherente = vendidasS1 + taquilla.getButacasSala1() == 150
                && vendidasS2 + taquilla.getButacasSala2() == 150;
        System.out.println("Resultado coherente: " + (coherente ? "sí" : "NO"));
        System.out.println("Tiempo de la sesión: " + duracion + " ms");
    }

    private static int venderSala1(Taquilla taquilla) {
        int total = 0;
        for (int i = 0; i < VENTAS_POR_TERMINAL; i++) {
            if (taquilla.venderSala1()) {
                total++;
            }
        }
        return total;
    }

    private static int venderSala2(Taquilla taquilla) {
        int total = 0;
        for (int i = 0; i < VENTAS_POR_TERMINAL; i++) {
            if (taquilla.venderSala2()) {
                total++;
            }
        }
        return total;
    }
}
