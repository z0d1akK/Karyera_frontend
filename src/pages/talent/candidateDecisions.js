export function decisionTypes(status) {
    const types = [];
    if (status === 'NOMINATED' || status === 'UNDER_REVIEW') {
        types.push('APPROVE', 'REJECT', 'REQUEST_REVIEW');
    }
    if (status === 'NOMINATED' || status === 'UNDER_REVIEW' || status === 'APPROVED') {
        types.push('REMOVE');
    }
    return types;
}
