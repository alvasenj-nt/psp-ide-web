/**
 * Compara el tiempo de un trabajo de CPU con 1 hilo frente a 2 hilos haciendo
 * el doble de trabajo. Cociente cercano a 1: paralelismo real.
 * Cociente cercano a 2: los hilos se ejecutan por turnos en un solo núcleo.
 */
public class DiagParalelismo {

    static volatile long sumidero;

    static long trabajo(long n) {
        long acc = 0;
        for (long i = 0; i < n; i++) {
            acc += i ^ (acc >>> 3);
        }
        return acc;
    }

    public static void main(String[] args) throws InterruptedException {
        long n = 1_000_000;
        long ms;
        do {
            long inicio = System.currentTimeMillis();
            sumidero = trabajo(n);
            ms = System.currentTimeMillis() - inicio;
            if (ms < 300) {
                n *= 2;
            }
        } while (ms < 300 && n < 2_000_000_000L);

        final long carga = n;
        long inicio1 = System.currentTimeMillis();
        sumidero = trabajo(carga);
        long un = System.currentTimeMillis() - inicio1;

        Thread a = new Thread(() -> sumidero = trabajo(carga));
        Thread b = new Thread(() -> sumidero = trabajo(carga));
        long inicio2 = System.currentTimeMillis();
        a.start();
        b.start();
        a.join();
        b.join();
        long dos = System.currentTimeMillis() - inicio2;

        System.out.println("## paralelismo.unHilo.ms=" + un);
        System.out.println("## paralelismo.dosHilos.ms=" + dos);
        System.out.println("## paralelismo.cociente=" + String.format("%.2f", (double) dos / Math.max(1, un)));
    }
}
