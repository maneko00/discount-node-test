import { VolumeForm } from '../../components'
import { Card, Page, Layout, SkeletonBodyText } from '@shopify/polaris'
import { Loading } from '@shopify/app-bridge-react'

import {
    DiscountMethod,
    RequirementType,
    onBreadcrumbAction,
} from '@shopify/discount-app-components'

import { useAppQuery } from '../../hooks'
import { useParams } from 'react-router-dom'

export default function VolumeEdit() {
    const { id } = useParams()
    const {
        data,
        isLoading,
        // isRefetching:discountTypeError,
    } = useAppQuery({
        url: `/api/discounts/${id}`,
        reactQueryOptions: {
            refetchOnReconnect: false,
        },
    });
    
    const pageTitle = 'Edit volume discount';
    if (isLoading) {
        return (
        <Page
            title={pageTitle}
            breadcrumbs={[
                {
                  content: 'discount',
                  onAction: () => onBreadcrumbAction(redirect, true),
                },
            ]}
        >
            <Loading />
            <Layout>
            <Layout.Section>
                <Card sectioned title="Title">
                <SkeletonBodyText />
                </Card>
                <Card title="Product">
                <Card.Section>
                    <SkeletonBodyText lines={1} />
                </Card.Section>
                <Card.Section>
                    <SkeletonBodyText lines={3} />
                </Card.Section>
                </Card>
                <Card sectioned title="Discount">
                <SkeletonBodyText lines={2} />
                </Card>
            </Layout.Section>
            <Layout.Section secondary>
                <Card sectioned title="QR code" />
            </Layout.Section>
            </Layout>
        </Page>
        )
    }
    console.log(data)
    const volume = SetVolume(data.isDiscountCode, data.discounts)

    return (
        <VolumeForm volume={volume} pageTitle={pageTitle} />
    )
}

export const SetVolume = (is_discount_code, volumes) => {
    if(is_discount_code === null)
    {
        return null
    }

    let volume;
    if(is_discount_code)
    {
        const code_discount_node = volumes.data.codeDiscountNode;
        const discount = code_discount_node.codeDiscount
        const common_key = SetVolumeCommon(discount, code_discount_node.metafield)
        volume = {
            ...common_key,
            id: code_discount_node.id,
            discountMethod: DiscountMethod.Code,
            discountCode: discount.codes.edges[0].node.code,
            usageTotalLimit: discount.usageLimit,
            usageOncePerCustomer: discount.appliesOncePerCustomer,
        }
        return volume
    }

    // 自動割引
    const automatic_discount_node = volumes.data.automaticDiscountNode;
    const discount = automatic_discount_node.automaticDiscount
    const common_key = SetVolumeCommon(discount, automatic_discount_node.metafield)
    volume = {
        ...common_key,
        id: automatic_discount_node.id,
        discountMethod: DiscountMethod.Automatic,
        discountCode: '',
        usageTotalLimit: null,
        usageOncePerCustomer: false,
    }
    return volume
}

export const SetVolumeCommon = (discount, metafield) => {
    const metafield_value = JSON.parse(metafield.value)
    const volume = {
        discountTitle: discount.title,
        combinesWith: {
            orderDiscounts: discount.combinesWith.orderDiscounts,
            productDiscounts: discount.combinesWith.productDiscounts,
            shippingDiscounts: discount.combinesWith.shippingDiscounts,
        },
        requirementType: RequirementType.None,
        startDate: discount.startsAt,
        endDate: discount.endsAt,
        configuration: {
            quantity: String(metafield_value.quantity),
            percentage: String(metafield_value.percentage),
        },
        metafieldId: metafield.id
    }
    return volume
}