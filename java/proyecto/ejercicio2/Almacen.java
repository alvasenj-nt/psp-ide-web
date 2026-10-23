package ejercicio2;

/**
 * Ejercicio 2: un cerrojo por prenda.
 *
 * Este almacén ya no pierde datos: cada método envuelve todo su cuerpo en
 * synchronized (this), que equivale a declarar el método synchronized. El
 * problema es que todas las operaciones usan el mismo cerrojo: mientras
 * alguien vende una camiseta, quien vende un pantalón tiene que esperar
 * aunque no compartan ningún dato. Además, cada venta registra el ticket,
 * una operación lenta, dentro de la zona protegida.
 *
 * Tareas:
 * 1. Ejecuta Main y anota el tiempo de la jornada.
 * 2. Declara dos cerrojos privados y finales: cerrojoCamisetas y
 *    cerrojoPantalones.
 * 3. Sustituye synchronized (this) por el cerrojo de la prenda que toca cada
 *    método, y deja dentro de cada bloque solo las líneas que leen o
 *    modifican el stock. registrarTicket() debe quedar fuera de los bloques.
 * 4. Vuelve a ejecutar Main y compara el tiempo.
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

    /** Si queda alguna camiseta, la vende, registra el ticket y devuelve true. */
    public boolean venderCamiseta() {
        synchronized (this) {
            if (camisetas == 0) {
                return false;
            }
            camisetas--;
            registrarTicket("camiseta");
            return true;
        }
    }

    /** Si queda algún pantalón, lo vende, registra el ticket y devuelve true. */
    public boolean venderPantalon() {
        synchronized (this) {
            if (pantalones == 0) {
                return false;
            }
            pantalones--;
            registrarTicket("pantalón");
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

    /** Simula la impresión del ticket: tarda unos milisegundos y no toca el stock. */
    private void registrarTicket(String prenda) {
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
