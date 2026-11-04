package ejercicio1;

/**
 * Ejercicio 1: taquilla de cine.
 *
 * La clase Taquilla gestiona el aforo de dos salas de cine independientes
 * (Sala 1 y Sala 2) mientras varios terminales venden entradas y tramitan
 * devoluciones simultáneamente (consulta Main.java).
 *
 * Requisitos:
 * - El recuento de butacas libres de cada sala debe ser siempre exacto y
 *   nunca pueden venderse más entradas que las disponibles.
 * - Las operaciones sobre salas distintas no deben estorbarse entre sí, y
 *   el bloqueo debe durar únicamente lo imprescindible para que la sesión
 *   de venta se complete en el menor tiempo posible.
 * - No modifiques la firma (nombre, parámetros ni tipo de retorno) de los
 *   métodos públicos ni elimines la llamada a imprimirEntrada().
 */
public class Taquilla {

    private int butacasSala1;
    private int butacasSala2;

    public Taquilla(int butacasSala1, int butacasSala2) {
        this.butacasSala1 = butacasSala1;
        this.butacasSala2 = butacasSala2;
    }

    public void devolverSala1(int entradas) {
        synchronized (this) {
            butacasSala1 += entradas;
        }
    }

    public void devolverSala2(int entradas) {
        synchronized (this) {
            butacasSala2 += entradas;
        }
    }

    /** Si queda alguna butaca libre en la Sala 1, la vende, imprime la entrada y devuelve true. */
    public boolean venderSala1() {
        synchronized (this) {
            if (butacasSala1 == 0) {
                return false;
            }
            butacasSala1--;
            imprimirEntrada("Sala 1");
            return true;
        }
    }

    /** Si queda alguna butaca libre en la Sala 2, la vende, imprime la entrada y devuelve true. */
    public boolean venderSala2() {
        synchronized (this) {
            if (butacasSala2 == 0) {
                return false;
            }
            butacasSala2--;
            imprimirEntrada("Sala 2");
            return true;
        }
    }

    public int getButacasSala1() {
        synchronized (this) {
            return butacasSala1;
        }
    }

    public int getButacasSala2() {
        synchronized (this) {
            return butacasSala2;
        }
    }

    /** Simula la impresión física de la entrada en papel térmico. */
    private void imprimirEntrada(String sala) {
        try {
            Thread.sleep(2);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
