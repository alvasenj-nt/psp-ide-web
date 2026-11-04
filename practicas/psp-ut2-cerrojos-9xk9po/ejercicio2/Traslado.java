package ejercicio2;

/**
 * Ejercicio 2: traslado de contenedores entre muelles.
 *
 * Cada instancia de Traslado representa una grúa que mueve un contenedor
 * desde un muelle de origen hasta un muelle de destino (consulta Main.java
 * y Muelle.java). Para realizar la maniobra con seguridad, la grúa debe
 * mantener reservados de forma exclusiva ambos muelles a la vez.
 *
 * Requisitos:
 * - Modifica el método run() para que cualquier par de grúas que operen
 *   simultáneamente entre dos muelles (incluso en sentidos opuestos)
 *   complete siempre su maniobra sin quedarse bloqueada.
 * - Ambas grúas deben seguir reservando de forma exclusiva los dos muelles
 *   durante el traslado y el mensaje final por consola debe conservar el
 *   sentido real desde el muelle de origen hasta el de destino.
 */
public class Traslado implements Runnable {

    private final Muelle origen;
    private final Muelle destino;

    public Traslado(Muelle origen, Muelle destino) {
        this.origen = origen;
        this.destino = destino;
    }

    @Override
    public void run() {
        String grua = Thread.currentThread().getName();

        synchronized (origen) {
            System.out.println(grua + " reserva el muelle " + origen.getNombre()
                    + " y espera el muelle " + destino.getNombre());
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
            synchronized (destino) {
                System.out.println(grua + " traslada contenedor de "
                        + origen.getNombre() + " a " + destino.getNombre());
            }
        }
    }
}

