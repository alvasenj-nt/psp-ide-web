public class DiagEntorno {
    public static void main(String[] args) {
        System.out.println("## java.version=" + System.getProperty("java.version"));
        System.out.println("## java.vendor=" + System.getProperty("java.vendor"));
        System.out.println("## procesadores=" + Runtime.getRuntime().availableProcessors());
        System.out.println("## acentos=ñáéíóú");
    }
}
