import { defineStyle, defineStyleConfig } from '@chakra-ui/react'

const formIntro = defineStyle({
    textDecoration: 'none',
    color: 'copy.dark',

})

export const textTheme = defineStyleConfig({
    variants: { formIntro },
})