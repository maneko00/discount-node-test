import { Shopify } from "@shopify/shopify-api";

const CREATE_CODE_MUTATION = `
mutation CreateCodeDiscount($discount: DiscountCodeAppInput!) {
  discount: discountCodeAppCreate(codeAppDiscount: $discount) {
    userErrors {
      code
      message
      field
    }
  }
}
`;

const UPDATE_CODE_MUTATION = `
  mutation UpdateCodeDiscount($discount: DiscountCodeAppInput!, $id: ID!) {
    discount: discountCodeAppUpdate(
      codeAppDiscount: $discount,
      id: $id
    ) {
      userErrors {
        code
        message
        field
      }
    }
  }
`;

export const CREATE_AUTOMATIC_MUTATION = `
mutation CreateAutomaticDiscount($discount: DiscountAutomaticAppInput!) {
  discount: discountAutomaticAppCreate(
    automaticAppDiscount: $discount
  ) {
    userErrors {
      code
      message
      field
    }
  }
}
`;

const UPDATE_AUTOMATIC_MUTATION = `
mutation UpdateAutomaticDiscount($discount: DiscountAutomaticAppInput!, $id: ID!) {
  discount: discountAutomaticAppUpdate(
    automaticAppDiscount: $discount,
    id: $id
  ) {
    userErrors {
      code
      message
      field
    }
  }
}
`;

const DISCOUNT_QUERY = `
  query Discount($id: ID!){
      discountNode(id: $id) {
          ... on DiscountNode {
              id
          }
      }
  }
`;

const DISCOUNT_CODE_QUERY = `
    query CodeDiscount($id: ID!){
        codeDiscountNode(id: $id) {
            codeDiscount {
                ... on DiscountCodeApp {
                    appliesOncePerCustomer
                    combinesWith {
                        orderDiscounts
                        productDiscounts
                        shippingDiscounts
                    }
                    endsAt
                    startsAt
                    status
                    title
                    usageLimit
                    codes (first:1) {
                        edges {
                            node {
                                code
                            }
                        }
                    }
                }
            }
            id
            metafield(namespace: "discount-tutorial", key: "volume-config") {
                id
                value
            }
        }
    }
`;

const DISCOUNT_AUTOMATIC_QUERY = `
    query AutomaticDiscount($id: ID!){
        automaticDiscountNode(id: $id) {
            automaticDiscount {
                ... on DiscountAutomaticApp {
                    combinesWith {
                        orderDiscounts
                        productDiscounts
                        shippingDiscounts
                    }
                    endsAt
                    startsAt
                    status
                    title
                }
            }
            id
            metafield(namespace: "discount-tutorial",key: "volume-config") {
                id
                value
            }
        }
    }
`;

/**
 * コード割引か判定
 * @param {Array|undefined} discounts - クエリデータ:
 *
 * @returns {boolean|null} `true`：コード割引、`false`：自動割引、`null`：待機中
 */
const IsDiscountCode = (discounts) => {
    const id = discounts?.data.discountNode.id
    if(id == undefined)
    {
        return null
    }
    
    return String(id).indexOf('Code') > 0
}

export default function applyDiscountCodeApiEndpoints(app) {

    const getClient = async (req, res) => {
        const session = await Shopify.Utils.loadCurrentSession(
            req,
            res,
            app.get("use-online-tokens")
        );

        if (!session) {
            res.status(401).send("Could not find a Shopify session");
            return null;
        }

        const client = new Shopify.Clients.Graphql(
            session.shop,
            session.accessToken
        );
        return client;
    };

    const runDiscountMutation = async (req, res, mutation) => {
        const client = await getClient(req, res);
        if(client === null) {
            return;
        }

        const data = await client.query({
            data: {
                query: mutation,
                variables: { discount: req.body }
            },
        });

        res.send(data.body);
    };

    const runDiscountUpdateMutation = async (req, res, mutation) => {
        const client = await getClient(req, res);
        if(client === null) {
            return;
        }

        const data = await client.query({
            data: {
                query: mutation,
                variables: { discount: req.body.data, id: req.body.id }
            },
        });
        res.send(data.body);
    };

    app.post("/api/discounts/code", async (req, res) => {
        await runDiscountMutation(req, res, CREATE_CODE_MUTATION);
    });

    app.post("/api/discounts/update-code", async (req, res) => {
        await runDiscountUpdateMutation(req, res, UPDATE_CODE_MUTATION);
    });
    
    app.post("/api/discounts/automatic", async (req, res) => {
        await runDiscountMutation(req, res, CREATE_AUTOMATIC_MUTATION);
    });
    
    app.post("/api/discounts/update-automatic", async (req, res) => {
        await runDiscountUpdateMutation(req, res, UPDATE_AUTOMATIC_MUTATION);
    });

    const runDiscountQuery = async (req, res, query) => {
        const client = await getClient(req, res);
        if(client === null) {
            return;
        }
      
        let key=''
        let discount_type=''
    
        if(query == DISCOUNT_QUERY)
        {
            key='Discount';
            discount_type='DiscountNode'
        }
        else if(query == DISCOUNT_CODE_QUERY)
        {
            key='CodeDiscount';
            discount_type='DiscountCodeNode'
        }
        else
        {
            key='AutomaticDiscount';
            discount_type='DiscountAutomaticNode'
        }

        const discounts = await client.query({
            data: {
                key,
                query,
                variables: {
                    id: `gid://shopify/${discount_type}/${req.params.id}`
                }
            },
        });
    
        return discounts.body
    }
    
    app.get("/api/discounts/:id", async (req, res) => {
        const discount_type = await runDiscountQuery(req, res, DISCOUNT_QUERY);
        // クーポン種類の判別
        const is_discount_code = IsDiscountCode(discount_type)

        if(is_discount_code)
        {
            const discounts = await runDiscountQuery(req, res, DISCOUNT_CODE_QUERY)
            const data = {discounts:discounts, isDiscountCode:is_discount_code}
            res.send(data);
        }
        else
        {
            const discounts = await runDiscountQuery(req, res, DISCOUNT_AUTOMATIC_QUERY)
            const data = {discounts:discounts, isDiscountCode:is_discount_code}
            res.send(data);
        }

    });
}
