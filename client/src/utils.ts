export function formatRPCError(error: { data: { message: string } }) {
  return error.data.message;
}
