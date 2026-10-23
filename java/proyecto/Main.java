public class Main {

    private static final int CAJEROS = 4;
    private static final int INGRESOS_POR_CAJERO = 100_000;

    public static void main(String[] args) throws InterruptedException {
        CuentaBancaria cuenta = new CuentaBancaria();
        Thread[] cajeros = new Thread[CAJEROS];

        long inicio = System.currentTimeMillis();
        for (int i = 0; i < CAJEROS; i++) {
            cajeros[i] = new Thread(() -> {
                for (int j = 0; j < INGRESOS_POR_CAJERO; j++) {
                    cuenta.ingresar(1);
                }
            }, "Cajero-" + (i + 1));
            cajeros[i].start();
        }
        for (Thread cajero : cajeros) {
            cajero.join();
        }
        long duracion = System.currentTimeMillis() - inicio;

        int esperado = CAJEROS * INGRESOS_POR_CAJERO;
        int obtenido = cuenta.getSaldo();
        System.out.println("Saldo esperado: " + esperado);
        System.out.println("Saldo obtenido: " + obtenido);
        System.out.println("Ingresos perdidos: " + (esperado - obtenido));
        System.out.println("Tiempo: " + duracion + " ms");
    }
}
