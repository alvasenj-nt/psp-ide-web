/**
 * Dependiente que atiende una lista de pedidos de una unidad cada uno.
 *
 * Requisitos:
 * - Cada dependiente trabaja en su propio hilo. Implementa la tarea sin
 *   heredar de Thread.
 * - Por cada pedido intenta vender una unidad de la prenda pedida. Si la venta
 *   sale bien, suma uno a sus ventas.
 * - Después de cada pedido espera 2 ms, el tiempo de atender al cliente.
 * - Si su hilo recibe una petición de interrupción, deja de atender pedidos,
 *   conserva la petición de interrupción y termina.
 */
public class Dependiente /* TODO 1 */ {

    private final String nombre;
    private final Almacen almacen;
    private final Prenda[] pedidos;
    private int ventas = 0;

    public Dependiente(String nombre, Almacen almacen, Prenda[] pedidos) {
        this.nombre = nombre;
        this.almacen = almacen;
        this.pedidos = pedidos;
    }

    // TODO 2: tarea del dependiente


    public String getNombre() {
        return nombre;
    }

    public int getVentas() {
        return ventas;
    }
}
