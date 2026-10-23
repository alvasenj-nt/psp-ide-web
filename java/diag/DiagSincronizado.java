public class DiagSincronizado {

    private int contador = 0;

    private synchronized void incrementar() {
        contador++;
    }

    public static void main(String[] args) throws InterruptedException {
        final int hilos = 4;
        final int iteraciones = 100_000;
        DiagSincronizado d = new DiagSincronizado();
        Thread[] t = new Thread[hilos];
        long inicio = System.currentTimeMillis();
        for (int i = 0; i < hilos; i++) {
            t[i] = new Thread(() -> {
                for (int j = 0; j < iteraciones; j++) {
                    d.incrementar();
                }
            });
            t[i].start();
        }
        for (Thread h : t) {
            h.join();
        }
        long ms = System.currentTimeMillis() - inicio;
        System.out.println("## sincronizado=esperado " + (hilos * iteraciones)
                + ", obtenido " + d.contador + ", " + ms + " ms");
        System.out.println("## sincronizado.ok=" + (d.contador == hilos * iteraciones));
    }
}
