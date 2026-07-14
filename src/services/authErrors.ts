const errorTranslations: Record<string, string> = {
    'Invalid login credentials': 'Credenciais de login inválidas.',
    'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
    'User already registered': 'Este e-mail já está registrado.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
    'Email rate limit exceeded': 'Limite de e-mails atingido. Tente novamente mais tarde.',
    'Signup is disabled': 'O cadastro está desativado no momento.',
    'Message not found': 'Mensagem não encontrada.',
    'Invalid OAuth callback': 'Falha na autenticação OAuth. Tente novamente.',
    'OAuth provider not enabled': 'Este provedor de login não está disponível.',
    'refresh_token_not_found': 'Sessão expirada. Faça login novamente.',
    'session_not_found': 'Sessão expirada. Faça login novamente.',
};

export function translateAuthError(message: string): string {
    if (!message) return 'Ocorreu um erro desconhecido. Tente novamente.';
    
    for (const [key, translation] of Object.entries(errorTranslations)) {
        if (message.toLowerCase().includes(key.toLowerCase())) {
            return translation;
        }
    }
    
    return message;
}
