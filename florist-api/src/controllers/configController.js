export const ConfigController = {
  /**
   * GET /api/config
   * Mengembalikan informasi rekening pembayaran dan informasi toko langsung dari process.env
   */
  getConfig(req, res) {
    return res.status(200).json({
      payment_info: {
        bank_name: process.env.BANK_NAME || 'BCA',
        bank_account: process.env.BANK_ACCOUNT || '8720194821',
        bank_holder: process.env.BANK_HOLDER || 'Bloom & Co. Florist',
      },
      store_info: {
        name: process.env.STORE_NAME || 'Bloom & Co. Botanical Atelier',
        address: process.env.STORE_ADDRESS || 'Jl. Prof. Sudarto No. 12, Tembalang, Semarang',
        open_time: process.env.STORE_OPEN_TIME || '08:00',
      },
    });
  },
};
