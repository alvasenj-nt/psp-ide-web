import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.lang.reflect.Modifier;
import org.junit.Test;

public class CuentaBancariaTest {

    @Test
    public void ingresosSecuencialesSeAcumulan() {
        CuentaBancaria cuenta = new CuentaBancaria();
        cuenta.ingresar(100);
        cuenta.ingresar(50);
        cuenta.ingresar(25);
        assertEquals("Saldo tras tres ingresos", 175, cuenta.getSaldo());
    }

    @Test
    public void ingresosConcurrentesNoSePierden() throws InterruptedException {
        final int hilos = 8;
        final int ingresos = 50_000;
        CuentaBancaria cuenta = new CuentaBancaria();
        Thread[] cajeros = new Thread[hilos];
        for (int i = 0; i < hilos; i++) {
            cajeros[i] = new Thread(() -> {
                for (int j = 0; j < ingresos; j++) {
                    cuenta.ingresar(1);
                }
            });
            cajeros[i].start();
        }
        for (Thread cajero : cajeros) {
            cajero.join();
        }
        assertEquals("Saldo tras ingresos concurrentes", hilos * ingresos, cuenta.getSaldo());
    }

    @Test
    public void ingresarEstaSincronizado() throws NoSuchMethodException {
        int modificadores = CuentaBancaria.class.getMethod("ingresar", int.class).getModifiers();
        assertTrue("ingresar() debe declararse synchronized", Modifier.isSynchronized(modificadores));
    }
}
