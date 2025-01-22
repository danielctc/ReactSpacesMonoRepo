import { defineStyle, defineStyleConfig } from '@chakra-ui/react'

const header = defineStyle({
    textDecoration: 'none',
    color: 'white',

})

export const linkTheme = defineStyleConfig({
    variants: { header },
})