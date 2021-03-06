import React from 'react';
import { connect } from 'react-redux'
import { Field, reduxForm, change } from 'redux-form'

import { Card, CardActions, CardHeader, CardText } from 'material-ui/Card'
import { SelectField, TextField } from 'redux-form-material-ui'
import MenuItem from 'material-ui/MenuItem'
import FlatButton from 'material-ui/FlatButton'
import FontIcon from 'material-ui/FontIcon'

import { cardSpace } from '../../lib/styles'
import { Row, Col } from 'react-flexbox-grid/lib/index'

import { sendTransaction, trackTx } from 'store/accountActions'
import { transferTokenTransaction } from 'store/tokenActions'
import Immutable from 'immutable'
import { gotoScreen } from 'store/screenActions'
import { positive, number, required, address } from '../../lib/validators'
import { mweiToWei, etherToWei, toHex } from 'lib/convert'
import log from 'loglevel'

const DefaultGas = 21000
const DefaultTokenGas = 23890

const Render = ({fields: {from, to}, accounts, account, tokens, token, onChangeToken, handleSubmit, invalid, pristine, resetForm, submitting, cancel}) => {
    log.debug('fields - from', from);

    return (
        <Card style={cardSpace}>
            <CardHeader
                title='Send Transaction'
                actAsExpander={false}
                showExpandableButton={false}
            />

            <CardText expandable={false}>
                <Row>
                    <Col xs={12} md={6}>
                        <Row>
                            <Col xs={12}>
                                <Field name="from"
                                       floatingLabelText="From"
                                       component={SelectField}
                                       fullWidth={true}>
                                       {accounts.map( (account) => 
                                        <MenuItem key={account.get('id')} value={account.get('id')} primaryText={account.get('id')} />
                                        )}
                                </Field>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12}>
                                <Field name="to"
                                       component={TextField}
                                       floatingLabelText="Target Address"
                                       hintText="0x0000000000000000000000000000000000000000"
                                       fullWidth={true}
                                       validate={[required, address]}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={8} md={6}>
                                <Field name="value"
                                       component={TextField}
                                       floatingLabelText="Amount"
                                       hintText="1.0000"
                                       validate={[required, number]}
                                />
                            </Col>
                            <Col xs={4} md={4}>
                                <Field name="token"
                                       component={SelectField}
                                       onChange={onChangeToken}
                                       value={token}
                                       fullWidth={true}>
                                       {tokens.map( (token) => 
                                        <MenuItem key={token.get('address')} value={token.get('address')} label={token.get('symbol')} primaryText={token.get('symbol')} />
                                        )}
                                </Field>
                            </Col>                            
                        </Row>
                    </Col>

                    <Col xs={12} md={6}>
                        <Row>
                            <Col xs={12}>
                                <Field name="gasPrice"
                                       component={TextField}
                                       floatingLabelText="Gas Price (MGas)"
                                       hintText="10000"
                                       validate={[required, number, positive]}
                                />
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={12}>
                                <Field name="gasAmount"
                                       component={TextField}
                                       floatingLabelText="Gas Amount"
                                       hintText="21000"
                                       validate={[required, number, positive]}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>

            </CardText>

            <CardActions>
                <FlatButton label="Send"
                            disabled={pristine || submitting || invalid }
                            onClick={handleSubmit}
                            icon={<FontIcon className="fa fa-check" />}/>
                <FlatButton label="Cancel"
                            onClick={cancel}
                            icon={<FontIcon className="fa fa-ban" />}/>
            </CardActions>
        </Card>
    )
};

const CreateTxForm = reduxForm({
    form: 'createTx',
    fields: ['to', 'from', 'value', 'token', 'gasPrice', 'gasAmount', 'token']
})(Render);

const CreateTx = connect(
    (state, ownProps) => {
        let tokens = state.tokens.get('tokens')
        return {
            initialValues: {
                from: ownProps.account.get('id'),
                gasPrice: 10000,
                gasAmount: DefaultGas,
                token: ''
            },
            accounts: state.accounts.get('accounts', Immutable.List()),
            tokens: tokens.unshift(Immutable.fromJS({'address': '', 'symbol': 'ETC'}))
        }
    },
    (dispatch, ownProps) => {
        return {
            onSubmit: data => {
                const afterTx = (txhash) => {
                    let txdetails = {
                        hash: txhash,
                        account: ownProps.account
                    };
                    dispatch(trackTx(txhash));
                    dispatch(gotoScreen('transaction', txdetails));
                };
                const resolver = (resolve, f) => {
                    return (x) => {
                        f.apply(x);
                        resolve(x);
                    }
                };
                if (data.token.length > 1)
                    return new Promise((resolve, reject) => {
                        dispatch(transferTokenTransaction(data.from, data.to,
                            toHex(data.gasAmount), toHex(mweiToWei(data.gasPrice)),
                            toHex(etherToWei(data.value)),
                            data.token))
                            .then(resolver(afterTx, resolve));
                        });
                else
                    return new Promise((resolve, reject) => {
                        dispatch(sendTransaction(data.from, data.to,
                            toHex(data.gasAmount), toHex(mweiToWei(data.gasPrice)),
                            toHex(etherToWei(data.value))
                        )).then(resolver(afterTx, resolve));
                    })
            },
            onChangeToken: (event, value, prev) => {
                // if switching from ETC to token, change default gas
                if (prev.length < 1 && !(address(value))) 
                    dispatch(change("createTx", "gasAmount", DefaultTokenGas))
                else if (!(address(prev)) && value.length < 1) 
                    dispatch(change("createTx", "gasAmount", DefaultGas))
                
            },
            cancel: () => {
                dispatch(gotoScreen('home'))
            }
        }
    }
)(CreateTxForm);



export default CreateTx