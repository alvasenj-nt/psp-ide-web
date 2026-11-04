package ejercicio3;

/**
 * Jornada de impresión del ejercicio 3 (solo lectura).
 *
 * Crea una oficina con una impresora compartida, lanza cinco empleados
 * durante 500 ms, cierra la oficina y muestra cuántos documentos ha
 * conseguido imprimir cada empleado y si el reparto ha sido equitativo.
 */
public class Main {

    private static final int NUM_EMPLEADOS = 5;

    public static void main(String[] args) throws InterruptedException {
        Oficina oficina = new Oficina();
        Empleado[] empleados = new Empleado[NUM_EMPLEADOS];
        Thread[] hilos = new Thread[NUM_EMPLEADOS];

        for (int i = 0; i < NUM_EMPLEADOS; i++) {
            empleados[i] = new Empleado(oficina);
            hilos[i] = new Thread(empleados[i], "Empleado-" + i);
        }

        for (Thread h : hilos) {
            h.start();
        }
        Thread.sleep(500);
        oficina.cerrar();
        for (Thread h : hilos) {
            h.join();
        }

        long total = 0;
        long min = Long.MAX_VALUE;
        long max = Long.MIN_VALUE;
        for (int i = 0; i < NUM_EMPLEADOS; i++) {
            long docs = empleados[i].getDocumentos();
            System.out.println("  " + hilos[i].getName() + ": " + docs + " documentos");
            total += docs;
            if (docs < min) min = docs;
            if (docs > max) max = docs;
        }
        System.out.println("Total impreso: " + total + " documentos");
        boolean turnoUnico = total <= 600;
        boolean equitativo = total >= NUM_EMPLEADOS && min > 0 && (max - min) <= Math.max(5, total / 10);
        if (!turnoUnico) {
            System.out.println("AVISO: varios empleados han usado la impresora al mismo tiempo");
        }
        System.out.println("Resultado coherente: " + (turnoUnico && equitativo ? "sí" : "NO"));
    }
}
