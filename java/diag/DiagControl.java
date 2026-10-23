/**
 * Comprueba sleep, join, interrupt, estados de Thread.State y wait/notifyAll.
 * En una JVM real: interrupt despierta en unos 200 ms con InterruptedException
 * y la bandera queda a false; los estados son NEW, TIMED_WAITING, WAITING y TERMINATED.
 */
public class DiagControl {

    private static final Object monitor = new Object();
    private static int turno = 0;

    public static void main(String[] args) throws InterruptedException {
        long t0 = System.currentTimeMillis();
        Thread.sleep(300);
        System.out.println("## sleep300.ms=" + (System.currentTimeMillis() - t0));

        final boolean[] terminado = {false};
        Thread lento = new Thread(() -> {
            try {
                Thread.sleep(300);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            terminado[0] = true;
        });
        lento.start();
        lento.join();
        System.out.println("## join.ok=" + terminado[0]);

        // interrupt sobre un hilo dormido
        final long[] despierta = {-1};
        final boolean[] excepcion = {false};
        final boolean[] bandera = {false};
        Thread dormilon = new Thread(() -> {
            long inicio = System.currentTimeMillis();
            try {
                Thread.sleep(5000);
            } catch (InterruptedException e) {
                excepcion[0] = true;
            }
            despierta[0] = System.currentTimeMillis() - inicio;
            bandera[0] = Thread.currentThread().isInterrupted();
        });
        String estadoNuevo = dormilon.getState().toString();
        dormilon.start();
        Thread.sleep(200);
        String estadoDurmiendo = dormilon.getState().toString();
        dormilon.interrupt();
        dormilon.join();
        String estadoFinal = dormilon.getState().toString();
        System.out.println("## interrupt.despierta.ms=" + despierta[0]);
        System.out.println("## interrupt.excepcion=" + excepcion[0]);
        System.out.println("## interrupt.bandera=" + bandera[0]);

        // estado de un hilo bloqueado en wait()
        final Object cerrojo = new Object();
        Thread esperando = new Thread(() -> {
            synchronized (cerrojo) {
                try {
                    cerrojo.wait();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        });
        esperando.start();
        Thread.sleep(200);
        String estadoEsperando = esperando.getState().toString();
        esperando.interrupt();
        esperando.join(3000);
        System.out.println("## estados=" + estadoNuevo + " > " + estadoDurmiendo + " > " + estadoFinal
                + "; en wait: " + estadoEsperando);

        // wait/notifyAll: dos hilos alternan 200 turnos
        final int rondas = 200;
        Thread ping = new Thread(() -> alternar(0, rondas));
        Thread pong = new Thread(() -> alternar(1, rondas));
        long t1 = System.currentTimeMillis();
        ping.start();
        pong.start();
        ping.join(10_000);
        pong.join(10_000);
        boolean ok = !ping.isAlive() && !pong.isAlive() && turno == rondas * 2;
        System.out.println("## waitnotify.ok=" + ok + " (" + turno + " turnos, "
                + (System.currentTimeMillis() - t1) + " ms)");
    }

    private static void alternar(int miTurno, int rondas) {
        for (int i = 0; i < rondas; i++) {
            synchronized (monitor) {
                while (turno % 2 != miTurno) {
                    try {
                        monitor.wait();
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return;
                    }
                }
                turno++;
                monitor.notifyAll();
            }
        }
    }
}
