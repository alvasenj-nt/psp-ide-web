package ejercicio2;

/**
 * Ejercicio 2: ventas lentas en la tienda.
 *
 * El almacén de camisetas y pantalones mantiene siempre un inventario
 * correcto, pero el equipo de la tienda ha detectado que las ventas tardan
 * más de lo debido:
 * - Mientras un dependiente vende una camiseta, el que vende pantalones se
 *   queda esperando, aunque las dos prendas no tengan nada que ver.
 * - Mientras se imprime el ticket de una venta, ningún otro dependiente
 *   puede avanzar.
 *
 * Tareas:
 * 1. Ejecuta el ejercicio y anota el tiempo de la jornada.
 * 2. Modifica esta clase para eliminar esas esperas innecesarias sin perder
 *    la corrección del inventario. No cambies la cabecera de los métodos
 *    públicos ni el comportamiento de cada uno.
 * 3. Vuelve a ejecutar el ejercicio y compara el tiempo.
 */
public class Almacen {

    private int camisetas;
    private int pantalones;

    public Almacen(int camisetas, int pantalones) {
        this.camisetas = camisetas;
        this.pantalones = pantalones;
    }

    public void reponerCamisetas(int unidades) {
        synchronized (this) {
            camisetas += unidades;
        }
    }

    public void reponerPantalones(int unidades) {
        synchronized (this) {
            pantalones += unidades;
        }
    }

    /** Si queda alguna camiseta, la vende, imprime el ticket y devuelve true. */
    public boolean venderCamiseta() {
        synchronized (this) {
            if (camisetas == 0) {
                return false;
            }
            camisetas--;
            imprimirTicket("camiseta");
            return true;
        }
    }

    /** Si queda algún pantalón, lo vende, imprime el ticket y devuelve true. */
    public boolean venderPantalon() {
        synchronized (this) {
            if (pantalones == 0) {
                return false;
            }
            pantalones--;
            imprimirTicket("pantalón");
            return true;
        }
    }

    public int getCamisetas() {
        synchronized (this) {
            return camisetas;
        }
    }

    public int getPantalones() {
        synchronized (this) {
            return pantalones;
        }
    }

    /** Imprime el ticket de una venta. */
    private void imprimirTicket(String prenda) {
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
