describe('return-request.service compatibility', () => {
  it('re-exports the canonical request service module from the legacy path', async () => {
    const legacyModule = await import('../services/return-request.service');
    const canonicalModule = await import('../services/request.service');

    expect(legacyModule.ReturnRequestService).toBe(canonicalModule.ReturnRequestService);
    expect(legacyModule.ServiceError).toBe(canonicalModule.ServiceError);
  });
});
