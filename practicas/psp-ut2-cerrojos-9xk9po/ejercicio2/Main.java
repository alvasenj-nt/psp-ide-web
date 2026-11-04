package ejercicio2;

/**
 * Maniobra del puerto del ejercicio 2 (solo lectura).
 *
 * Crea dos muelles de carga (Norte y Sur) y lanza dos grúas a la vez en
 * sentidos opuestos: la Grua-1 traslada un contenedor de Norte a Sur y la
 * Grua-2 traslada otro de Sur a Norte.
 *
 * Espera hasta 1,5 segundos a que terminen las dos grúas y muestra si la
 * maniobra se ha completado o ha quedado bloqueada.
 */
public class Main {

    public static void main(String[] args) throws InterruptedException {
        Muelle norte = new Muelle(1, "Norte");
        Muelle sur = new Muelle(2, "Sur");

        Thread grua1 = new Thread(new Traslado(norte, sur), "Grua-1");
        Thread grua2 = new Thread(new Traslado(sur, norte), "Grua-2");
        grua1.setDaemon(true);
        grua2.setDaemon(true);

        grua1.start();
        grua2.start();

        grua1.join(1500);
        grua2.join(1500);

        boolean completados = !grua1.isAlive() && !grua2.isAlive();
        if (completados) {
            System.out.println("Los dos traslados han terminado");
        } else {
            System.out.println("BLOQUEO: las dos grúas han quedado detenidas esperando el otro muelle");
        }
        System.out.println("Resultado coherente: " + (completados ? "sí" : "NO"));
    }
}
