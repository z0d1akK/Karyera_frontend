const MOCK_USER = {
    id: '7a4c1b3e-6a2f-4e21-9d91-1f9f5a8b2c11',
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan.ivanov@example.com',
    role: 'EMPLOYEE',
};

export const mockAuthApi = {
    login({ email, password, login }) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const username = login || email;
                if (username !== 'ivan.ivanov@example.com' || password !== 'password') {
                    reject({
                        response: {
                            data: { message: 'Неверный логин или пароль' },
                        },
                    });
                    return;
                }

                resolve({
                    accessToken: 'mock-access-token',
                    refreshToken: 'mock-refresh-token',
                    user: MOCK_USER,
                });
            }, 400);
        });
    },
};
