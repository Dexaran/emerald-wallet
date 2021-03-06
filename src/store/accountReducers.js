import Immutable from 'immutable'
import log from 'loglevel'

import { Wei, TokenUnits } from '../lib/types'
import { toNumber } from '../lib/convert'

const initial = Immutable.fromJS({
    accounts: [],
    trackedTransactions: [],
    loading: false
});

const initialAddr = Immutable.Map({
    id: null,
    balance: null,
    tokens: [],
    txcount: null
});

function onLoading(state, action) {
    switch (action.type) {
        case 'ACCOUNT/LOADING':
            return state
                .set('loading', true);
        default:
            return state
    }
}

function onSetAccountsList(state, action) {
    switch (action.type) {
        case 'ACCOUNT/SET_LIST':
            return state
                .set('accounts',
                    Immutable.fromJS(action.accounts)
                        .map((id) => initialAddr.set('id', id))
                )
                .set('loading', false);
        default:
            return state
    }
}

function onSetBalance(state, action) {
    if (action.type == 'ACCOUNT/SET_BALANCE') {
        return updateAccount(state, action.accountId, (acc) =>
            acc.set('balance', new Wei(action.value))
        );
    }
    return state
}

function onSetTokenBalance(state, action) {
    if (action.type == 'ACCOUNT/SET_TOKEN_BALANCE') {
        return updateAccount(state, action.accountId, (acc) => {
            let tokens = Immutable.fromJS(acc.get("tokens"))
            return acc.set("tokens", updateToken(tokens, action.token, action.value))
            }
        );
    }
    return state
}

function onSetTxCount(state, action) {
    if (action.type == 'ACCOUNT/SET_TXCOUNT') {
        return updateAccount(state, action.accountId, (acc) =>
            acc.set("txcount", toNumber(action.value))
        )
    }
    return state
}

function onAddAccount(state, action) {
    if (action.type == 'ACCOUNT/ADD_ACCOUNT') {
        return addAccount(state, action.accountId);
    }
    return state;
}

/** TODO (connector?): Accounts should be associated with names **/
function addAccount(state, id) {
    return state.update("accounts", (accounts) => { 
        return accounts.push(initialAddr.set('id', id))
    })
}

function updateAccount(state, id, f) {
    return state.update("accounts", (accounts) => {
        const pos = accounts.findKey((acc) => acc.get('id') === id);
        if (pos >= 0) {
            return accounts.update(pos, f)
        }
        return accounts
    })
}

function updateToken(tokens, token, value) {
    const pos = tokens.findKey((tok) => tok.get('address') === token.address);
    const balance = new TokenUnits(value, (token.decimals) ? token.decimals : '0x0');
    if (pos >= 0) 
        return tokens.update(pos, (tok) => tok.set('balance', balance))
    else 
        return tokens.push(Immutable.fromJS({'address': token.address, 'symbol': token.symbol})
                                    .set('balance', balance))
}

function onTrackTx(state, action) {
    if (action.type === 'ACCOUNT/TRACK_TX') {
        let data = Immutable.fromJS({
            hash: action.hash
        });
        return state.update('trackedTransactions', (txes) => txes.push(data));
    }
    return state
}

function onUpdateTx(state, action) {
    if (action.type === 'ACCOUNT/UPDATE_TX') {
        return state.update('trackedTransactions', (txes) => {
            let pos = txes.findKey((tx) => tx.get('hash') === action.tx.hash);
            if (pos >= 0) {
                let data = Immutable.fromJS(action.tx);
                if (typeof action.tx.value === 'string') {
                    data = data.set('value', new Wei(action.tx.value))
                }
                if (typeof action.tx.gasPrice === 'string') {
                    data = data.set('gasPrice', new Wei(action.tx.gasPrice))
                }
                txes = txes.set(pos, data);
            }
            return txes
        })
    }
    return state
}

export const accountsReducers = function(state, action) {
    state = state || initial;
    state = onLoading(state, action);
    state = onSetAccountsList(state, action);
    state = onAddAccount(state, action);    
    state = onSetBalance(state, action);
    state = onSetTxCount(state, action);
    state = onSetTokenBalance(state, action);
    state = onTrackTx(state, action);
    state = onUpdateTx(state, action);
    return state;
};