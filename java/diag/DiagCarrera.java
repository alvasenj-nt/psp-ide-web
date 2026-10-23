/**
 * Mide si el planificador de hilos intercala la ejecución a mitad de un bucle.
 * Fase 1: incrementos sin sincronizar sobre un campo compartido (pérdidas).
 * Fase 2: cada hilo cuenta cuántas veces encuentra que otro hilo ha escrito
 * entre dos de sus iteraciones (cambios de hilo observados).
 */
public class DiagCarrera {

    static int contador = 0;
    static volatile int ultimoHilo = -1;

    public static void main(String[] args) throws InterruptedException {
        final int hilos = 4;
        final int iteraciones = 100_000;

        for (int ronda = 1; ronda <= 3; ronda++) {
            contador = 0;
            Thread[] t = new Thread[hilos];
            long inicio = System.currentTimeMillis();
            for (int i = 0; i < hilos; i++) {
                t[i] = new Thread(() -> {
                    for (int j = 0; j < iteraciones; j++) {
                        contador++;
                    }
                });
                t[i].start();
            }
            for (Thread h : t) {
                h.join();
            }
            long ms = System.currentTimeMillis() - inicio;
            int esperado = hilos * iteraciones;
            System.out.println("## carrera.ronda" + ronda + "=esperado " + esperado
                    + ", obtenido " + contador + ", perdidos " + (esperado - contador) + ", " + ms + " ms");
        }

        final long[] cambios = new long[hilos];
        Thread[] t = new Thread[hilos];
        for (int i = 0; i < hilos; i++) {
            final int id = i;
            t[i] = new Thread(() -> {
                long vistos = 0;
                for (int j = 0; j < iteraciones; j++) {
                    if (ultimoHilo != id) {
                        vistos++;
                        ultimoHilo = id;
                    }
                }
                cambios[id] = vistos;
            });
            t[i].start();
        }
        for (Thread h : t) {
            h.join();
        }
        long total = 0;
        for (long c : cambios) {
            total += c;
        }
        System.out.println("## intercalado.cambios=" + total);
    }
}
